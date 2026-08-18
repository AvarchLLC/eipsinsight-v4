'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronDown, FileText, FlaskConical, GitCommit, Layers, Radio, Search, Star, X } from 'lucide-react';

function renderNameWithHighlight(fullStr: string, highlight: string) {
  const index = fullStr.toLowerCase().indexOf(highlight.toLowerCase());
  if (index === -1) return <strong className="font-bold text-foreground">{fullStr}</strong>;

  const before = fullStr.slice(0, index);
  const match = fullStr.slice(index, index + highlight.length);
  const after = fullStr.slice(index + highlight.length);

  return (
    <span className="font-medium text-foreground">
      {before}
      <strong className="font-bold text-primary underline decoration-primary/50 underline-offset-2">{match}</strong>
      {after}
    </span>
  );
}
import { cn } from '@/lib/utils';
import {
  STAGE_ORDER,
  STAGE_CHART_COLORS,
  stageBadgeClass,
  stageDefinition,
  stageLabel,
  type UpgradeBucket,
} from '@/lib/upgrade-stages';
import type { UpgradeRegistryEntry } from '@/data/upgrade-registry';
import { StageBadge } from '@/components/upgrade/stage-badge';
import { UpgradeEipCard } from '@/components/upgrade/upgrade-eip-card';
import { UpgradeTimelineChart } from '@/components/upgrade/upgrade-timeline-chart';
import { UpgradeSubscriptionCard } from '@/components/upgrade-subscription-card';
import { UpgradeBlogCarousel } from '@/components/upgrade/upgrade-blog-carousel';
import { UpgradeEipJumper } from '@/components/upgrade/upgrade-eip-jumper';
import type { UpgradeArticle } from '@/lib/upgrade-articles';
import type {
  UpgradeCompositionEip,
  UpgradeCompositionEvent,
  UpgradeDevnetSummary,
  UpgradeTimelinePoint,
} from '@/components/upgrade/types';
import { CopyLinkButton } from '@/components/header';

import { eipTitles } from '@/data/network-upgrades';

function isCoreEip(eip: UpgradeCompositionEip): boolean {
  const cat = (eip.category || eipTitles[String(eip.eip_number)]?.category || '').trim().toLowerCase();
  if (
    cat === 'networking' ||
    cat === 'informational' ||
    cat === 'meta' ||
    cat === 'erc'
  ) {
    return false;
  }
  return cat === 'core' || !cat;
}

function coreStageLabel(bucket: UpgradeBucket): string {
  switch (bucket) {
    case 'scheduled':
      return 'Core EIPs SFI';
    case 'considered':
      return 'Core EIPs CFI';
    case 'proposed':
      return 'Core EIPs PFI';
    case 'declined':
      return 'Core EIPs DFI';
    case 'included':
      return 'Core EIPs Included';
    default:
      return stageLabel(bucket);
  }
}

interface TocItem {
  id: string;
  label: string;
  count?: number;
}

export function UpgradeDetailBody({
  slug,
  name,
  metaEip,
  entry,
  composition,
  events,
  timelineData,
  devnets = [],
}: {
  slug: string;
  name: string;
  metaEip?: number | null;
  entry: UpgradeRegistryEntry | null;
  composition: UpgradeCompositionEip[];
  events: UpgradeCompositionEvent[];
  timelineData: UpgradeTimelinePoint[];
  devnets?: UpgradeDevnetSummary[];
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [layerFilter, setLayerFilter] = useState<'all' | 'EL' | 'CL'>('all');
  const [isDeclinedExpanded, setIsDeclinedExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('about');
  const [articles, setArticles] = useState<UpgradeArticle[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/upgrade-articles/${slug}`)
      .then((response) => (response.ok ? response.json() : []))
      .then((posts: UpgradeArticle[]) => {
        if (!cancelled) setArticles(posts);
      })
      .catch(() => {
        if (!cancelled) setArticles([]);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const handleJumpToEip = (eipNumber: number) => {
    const targetEip = composition.find((e) => e.eip_number === eipNumber);
    if (targetEip && targetEip.bucket === 'declined') {
      setIsDeclinedExpanded(true);
    }

    setTimeout(() => {
      const element = document.getElementById(`eip-${eipNumber}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-background');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2', 'ring-offset-background');
        }, 2500);
      } else {
        const stageElement = targetEip?.bucket ? document.getElementById(`stage-${targetEip.bucket}`) : null;
        if (stageElement) {
          stageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }, 100);
  };

  useEffect(() => {
    const handleHashScroll = () => {
      const hash = window.location.hash.toUpperCase();
      if (!hash) return;

      // Handle direct EIP hash (e.g., #EIP-7732 or #7732)
      const eipMatch = hash.match(/^#(?:EIP-?)?(\d+)$/i);
      if (eipMatch && eipMatch[1]) {
        const eipNum = parseInt(eipMatch[1], 10);
        handleJumpToEip(eipNum);
        return;
      }

      const mapping: Record<string, string> = {
        '#DFI': 'stage-declined',
        '#PFI': 'stage-proposed',
        '#CFI': 'stage-considered',
        '#SFI': 'stage-scheduled',
        '#INCLUDED': 'stage-included',
        '#DECLINED': 'stage-declined',
        '#PROPOSED': 'stage-proposed',
        '#CONSIDERED': 'stage-considered',
        '#SCHEDULED': 'stage-scheduled',
        '#CHART': 'timeline-chart',
        '#TIMELINE': 'timeline-chart',
        '#ACTIVITY': 'activity',
        '#CHANGES': 'activity',
        '#ARTICLES': 'related-articles',
      };

      const targetId = mapping[hash] || hash.slice(1).toLowerCase();

      if (targetId === 'stage-declined') {
        setIsDeclinedExpanded(true);
      }

      setTimeout(() => {
        const element = document.getElementById(targetId) || document.getElementById(hash.slice(1));
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    };

    const initialTimeout = setTimeout(handleHashScroll, 300);

    window.addEventListener('hashchange', handleHashScroll);
    return () => {
      clearTimeout(initialTimeout);
      window.removeEventListener('hashchange', handleHashScroll);
    };
  }, []);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const hasLayerData = composition.some((eip) => eip.curation?.layer);
  const isFiltering = Boolean(normalizedQuery) || layerFilter !== 'all';
  const matchesQuery = (eip: UpgradeCompositionEip) => {
    if (layerFilter !== 'all' && eip.curation?.layer !== layerFilter) return false;
    if (!normalizedQuery) return true;
    return (
      `eip-${eip.eip_number}`.includes(normalizedQuery) ||
      String(eip.eip_number).includes(normalizedQuery) ||
      (eip.title ?? '').toLowerCase().includes(normalizedQuery) ||
      (eip.curation?.layman_title ?? '').toLowerCase().includes(normalizedQuery)
    );
  };

  const { coreByStage, otherEips } = useMemo(() => {
    const coreGrouped = new Map<UpgradeBucket, UpgradeCompositionEip[]>();
    for (const bucket of STAGE_ORDER) coreGrouped.set(bucket, []);
    const other: UpgradeCompositionEip[] = [];

    for (const eip of composition) {
      if (isCoreEip(eip)) {
        if (eip.bucket) coreGrouped.get(eip.bucket)?.push(eip);
      } else {
        other.push(eip);
      }
    }

    for (const list of coreGrouped.values()) {
      list.sort((a, b) => {
        const aHeadliner = a.curation?.headliner_of === slug ? 0 : 1;
        const bHeadliner = b.curation?.headliner_of === slug ? 0 : 1;
        return aHeadliner - bHeadliner || a.eip_number - b.eip_number;
      });
    }

    other.sort((a, b) => a.eip_number - b.eip_number);

    return { coreByStage: coreGrouped, otherEips: other };
  }, [composition, slug]);

  const visibleStages = STAGE_ORDER.filter(
    (bucket) => (coreByStage.get(bucket)?.length ?? 0) > 0
  );
  const headliners = entry?.headliners ?? [];
  const showTimelineChart = timelineData.length > 1;
  const showActivity = events.length > 0;

  const tocItems: TocItem[] = useMemo(() => {
    const items: TocItem[] = [{ id: 'about', label: `About ${name}` }];
    if (devnets.length > 0) items.push({ id: 'devnets', label: 'Devnets & Testnets', count: devnets.length });
    if (headliners.length > 0) items.push({ id: 'headliners', label: 'Headliners' });
    for (const bucket of visibleStages) {
      items.push({
        id: `stage-${bucket}`,
        label: coreStageLabel(bucket),
        count: coreByStage.get(bucket)?.length ?? 0,
      });
    }
    if (otherEips.length > 0) {
      items.push({
        id: 'other-eips',
        label: 'Other EIPs',
        count: otherEips.length,
      });
    }
    if (showTimelineChart) items.push({ id: 'timeline-chart', label: 'Scope over time' });
    if (showActivity) items.push({ id: 'activity', label: 'Recent changes' });
    if (articles.length > 0) items.push({ id: 'related-articles', label: 'Related articles' });
    return items;
  }, [name, devnets.length, headliners.length, visibleStages, coreByStage, otherEips.length, showTimelineChart, showActivity, articles.length]);

  useEffect(() => {
    const sections = tocItems
      .map((item) => document.getElementById(item.id))
      .filter((element): element is HTMLElement => Boolean(element));
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (observedEntries) => {
        const visible = observedEntries
          .filter((observed) => observed.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveSection(visible[0].target.id);
      },
      { rootMargin: '-96px 0px -60% 0px' }
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [tocItems]);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-12 pt-6 sm:px-6">
      <div className="flex gap-6">
        {/* Sticky sidebar: TOC + search + subscription */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] space-y-4 overflow-y-auto pb-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Filter EIPs..."
                className="h-9 w-full rounded-md border border-border bg-muted/60 pl-8 pr-8 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {hasLayerData && (
              <div className="flex items-center gap-1">
                <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Layer
                </span>
                {(['all', 'EL', 'CL'] as const).map((option) => (
                  <button
                    key={option}
                    onClick={() => setLayerFilter(option)}
                    className={cn(
                      'rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors',
                      layerFilter === option
                        ? option === 'EL'
                          ? 'border-indigo-500/40 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                          : option === 'CL'
                            ? 'border-teal-500/40 bg-teal-500/15 text-teal-700 dark:text-teal-300'
                            : 'border-primary/40 bg-primary/10 text-primary'
                        : 'border-border bg-muted/50 text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {option === 'all' ? 'All' : option}
                  </button>
                ))}
              </div>
            )}

            <nav className="rounded-xl border border-border bg-card/60 p-2">
              <h3 className="px-2 pb-1 pt-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                On this page
              </h3>
              <ul className="space-y-0.5">
                {tocItems.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => scrollToSection(item.id)}
                      className={cn(
                        'flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors',
                        activeSection === item.id
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-1.5">
                        {item.id.startsWith('stage-') && (
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{
                              backgroundColor:
                                STAGE_CHART_COLORS[item.id.slice(6) as UpgradeBucket],
                            }}
                          />
                        )}
                        <span className="truncate">{item.label}</span>
                      </span>
                      {typeof item.count === 'number' && (
                        <span
                          className={cn(
                            'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                            activeSection === item.id
                              ? 'bg-primary/15 text-primary'
                              : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {item.count}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            <UpgradeSubscriptionCard slug={slug} name={name} compact />
          </div>
        </aside>

        {/* Main content */}
        <div ref={contentRef} className="min-w-0 flex-1 space-y-8">
          {/* Quick EIP Finder & Jumper */}
          {composition.length > 0 && (
            <UpgradeEipJumper
              upgradeName={name}
              composition={composition}
              onJumpToEip={handleJumpToEip}
            />
          )}

          {/* Mobile search */}
          <div className="lg:hidden">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Filter EIPs..."
                className="h-9 w-full rounded-md border border-border bg-muted/60 pl-8 text-sm text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* About */}
          {entry && (
            <section id="about" className="scroll-mt-28">
              <div className="rounded-xl border border-border bg-card/60 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                    About {name}
                  </h2>
                  <CopyLinkButton sectionId="about" className="h-7 w-7 rounded-md border border-border bg-muted/60 hover:border-primary/40 hover:bg-primary/10" />
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {entry.description}
                </p>
                {metaEip && (
                  <div className="mt-3.5 flex items-center gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs text-foreground">
                    <FileText className="h-4 w-4 shrink-0 text-amber-500" />
                    <div>
                      <span className="font-semibold text-foreground">Canonical Meta EIP:</span>{' '}
                      <Link
                        href={`/eip/${metaEip}`}
                        className="font-mono font-bold text-amber-700 dark:text-amber-300 underline hover:text-primary"
                      >
                        EIP-{metaEip}
                      </Link>
                      <span className="ml-1.5 text-muted-foreground">
                        — Official specification track & scope container for {name}.
                      </span>
                    </div>
                  </div>
                )}
                {entry.nameOriginDetails && (
                  <div className="mt-3.5 flex items-center gap-2.5 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3.5 py-2 text-xs text-foreground">
                    <Layers className="h-4 w-4 shrink-0 text-purple-500" />
                    <div>
                      <span className="font-semibold text-foreground">Name Origin:</span>{' '}
                      Derived from{' '}
                      <span>
                        {renderNameWithHighlight(entry.nameOriginDetails.clName, entry.nameOriginDetails.clHighlight)} (CL)
                      </span>{' '}
                      and{' '}
                      <span>
                        {renderNameWithHighlight(entry.nameOriginDetails.elName, entry.nameOriginDetails.elHighlight)} (EL)
                      </span>
                      {entry.nameOriginDetails.eip && (
                        <span className="ml-1.5 text-muted-foreground">
                          — per Hardfork Naming Conventions (
                          <Link
                            href={`/eip/${entry.nameOriginDetails.eip}`}
                            className="text-primary underline font-medium"
                          >
                            EIP-{entry.nameOriginDetails.eip}
                          </Link>
                          )
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {!entry.nameOriginDetails && entry.nameOrigin && (
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground/80">
                    {entry.nameOrigin}
                  </p>
                )}
                {entry.mascot && (
                  <div className="mt-3.5 flex items-center gap-2.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3.5 py-2 text-xs text-foreground">
                    <span className="text-lg">{entry.mascot.emoji}</span>
                    <div>
                      <span className="font-semibold text-foreground">Upgrade Mascot: {entry.mascot.name}</span>
                      {entry.mascot.processNote && (
                        <span className="ml-1.5 text-muted-foreground">
                          — {entry.mascot.processNote}
                          {entry.mascot.eip && (
                            <Link href={`/eip/${entry.mascot.eip}`} className="ml-1 text-primary underline">
                              (EIP-{entry.mascot.eip})
                            </Link>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Devnets & Testnets section */}
          {devnets.length > 0 && (
            <section id="devnets" className="scroll-mt-28">
              <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="h-5 w-5 text-blue-500 shrink-0" />
                    <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                      Devnets & Testnets
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href="/upgrade/devnets"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      View all devnets
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                    <CopyLinkButton sectionId="devnets" className="h-7 w-7 rounded-md border border-border/40 bg-card/60 hover:border-primary/40 hover:bg-primary/10" />
                  </div>
                </div>

                <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  {slug === 'glamsterdam' ? (
                    <>
                      Devnets and early testnets (such as the <strong>Platterburg Testnet</strong> scope in <strong>glamsterdam-devnet-8</strong>) are developer testbeds where upgrade features, client specs, and consensus parameters get battle-tested before public testnet rollouts. Discover all specifications, client support matrices, and live status on the <Link href="/upgrade/devnets" className="font-semibold text-primary underline underline-offset-2">full devnets directory</Link>.
                    </>
                  ) : slug === 'hegota' ? (
                    <>
                      Devnets and feature testnets (such as <strong>focil-devnet-0</strong> for FOCIL EIP-7805 and <strong>frames-devnet-0</strong> for Frame Transactions EIP-8141) are developer testbeds for the Hegotá upgrade (Heze consensus + Bogota execution). Discover all specifications and client support matrices on the <Link href="/upgrade/devnets" className="font-semibold text-primary underline underline-offset-2">full devnets directory</Link>.
                    </>
                  ) : (
                    <>
                      Developer test networks where upgrade features and client implementations get battle-tested before public testnets. View all specifications and client support matrices on the <Link href="/upgrade/devnets" className="font-semibold text-primary underline underline-offset-2">full devnets directory</Link>.
                    </>
                  )}
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {devnets.slice(0, 4).map((devnet) => (
                    <Link
                      key={devnet.id}
                      href={`/upgrade/devnets/${devnet.id}`}
                      className="group flex flex-col justify-between rounded-xl border border-border/60 bg-card/80 p-3.5 transition-colors hover:border-blue-500/40 hover:bg-card"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-foreground">
                            {devnet.title ?? devnet.id}
                          </span>
                          {devnet.active ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                              <Radio className="h-2.5 w-2.5" />
                              live
                            </span>
                          ) : (
                            <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:text-red-400">
                              inactive
                            </span>
                          )}
                        </div>
                        {devnet.eip_section_title && (
                          <p className="mt-1.5 text-[11px] font-medium text-blue-600 dark:text-blue-400">
                            {devnet.eip_section_title}
                          </p>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
                        <span>{devnet.eip_count} EIPs in scope</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
                          View spec
                          <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Headliner callout */}
          {headliners.length > 0 && (
            <section id="headliners" className="scroll-mt-28">
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 fill-current text-primary" />
                    <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                      Headliner{headliners.length > 1 ? 's' : ''}
                    </h2>
                  </div>
                  <CopyLinkButton sectionId="headliners" className="h-7 w-7 rounded-md border border-border/40 bg-card/60 hover:border-primary/40 hover:bg-primary/10" />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  The defining feature{headliners.length > 1 ? 's' : ''} this upgrade is built
                  around.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {headliners.map((headliner) => (
                    <Link
                      key={headliner.eip}
                      href={`/eip/${headliner.eip}`}
                      className="rounded-lg border border-border bg-card/60 p-3 transition-colors hover:border-primary/40"
                    >
                      <span className="font-mono text-xs font-semibold text-primary">
                        EIP-{headliner.eip}
                      </span>
                      <h3 className="mt-0.5 text-sm font-semibold text-foreground">
                        {headliner.title}
                      </h3>
                      {headliner.note && (
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {headliner.note}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Stage sections (Core EIPs) */}
          {visibleStages.map((bucket) => {
            const allEips = coreByStage.get(bucket) ?? [];
            const eips = allEips.filter(matchesQuery);
            const isDeclined = bucket === 'declined';
            const collapsed = isDeclined && !isDeclinedExpanded && !isFiltering;

            return (
              <section key={bucket} id={`stage-${bucket}`} className="scroll-mt-28">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                    {coreStageLabel(bucket)}
                  </h2>
                  <span
                    className={cn(
                      'rounded-full border px-2 py-0.5 text-xs font-semibold',
                      stageBadgeClass(bucket)
                    )}
                  >
                    {allEips.length}
                  </span>
                  <CopyLinkButton
                    sectionId={bucket === 'declined' ? 'DFI' : bucket === 'proposed' ? 'PFI' : bucket === 'considered' ? 'CFI' : bucket === 'scheduled' ? 'SFI' : 'INCLUDED'}
                    className="h-6 w-6 rounded-md border border-border/40 bg-muted/40 hover:border-primary/40 hover:bg-primary/10"
                    tooltipLabel="Copy stage link"
                  />
                  {isDeclined && !isFiltering && (
                    <button
                      onClick={() => setIsDeclinedExpanded((current) => !current)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
                    >
                      <ChevronDown
                        className={cn(
                          'h-3.5 w-3.5 transition-transform duration-300',
                          isDeclinedExpanded && 'rotate-180'
                        )}
                      />
                      {isDeclinedExpanded ? 'Hide' : 'Show'}
                    </button>
                  )}
                </div>
                <p className="mb-3 max-w-3xl text-sm text-muted-foreground">
                  {stageDefinition(bucket)}
                </p>
                {!collapsed && (
                  <div className="space-y-3">
                    {eips.map((eip) => (
                      <UpgradeEipCard key={eip.eip_number} eip={eip} upgradeSlug={slug} />
                    ))}
                    {eips.length === 0 && isFiltering && (
                      <p className="rounded-lg border border-border bg-card/60 px-4 py-3 text-sm text-muted-foreground">
                        No EIPs in this stage match the current filters.
                      </p>
                    )}
                  </div>
                )}
              </section>
            );
          })}

          {/* Other EIPs section (Networking, Meta, Informational, ERCs) placed after DFI */}
          {otherEips.length > 0 && (
            <section id="other-eips" className="scroll-mt-28">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                  Other EIPs
                </h2>
                <span className="rounded-full border border-purple-500/30 bg-purple-500/15 px-2 py-0.5 text-xs font-semibold text-purple-700 dark:text-purple-300">
                  {otherEips.length}
                </span>
                <CopyLinkButton sectionId="other-eips" className="h-6 w-6 rounded-md border border-border/40 bg-muted/40 hover:border-primary/40 hover:bg-primary/10" tooltipLabel="Copy link" />
              </div>
              <p className="mb-3 max-w-3xl text-sm text-muted-foreground">
                Networking, Meta, Informational, and ERC standards associated with this upgrade.
              </p>
              <div className="space-y-3">
                {otherEips.filter(matchesQuery).map((eip) => (
                  <UpgradeEipCard key={eip.eip_number} eip={eip} upgradeSlug={slug} showStageBadge />
                ))}
                {otherEips.filter(matchesQuery).length === 0 && isFiltering && (
                  <p className="rounded-lg border border-border bg-card/60 px-4 py-3 text-sm text-muted-foreground">
                    No EIPs in this section match the current filters.
                  </p>
                )}
              </div>
            </section>
          )}

          {composition.length === 0 && (
            <div className="rounded-xl border border-border bg-card/60 px-4 py-8 text-center text-sm text-muted-foreground">
              No EIP composition data yet for this upgrade.
            </div>
          )}

          {/* Scope over time */}
          {showTimelineChart && (
            <section id="timeline-chart" className="scroll-mt-28">
              <UpgradeTimelineChart data={timelineData} upgradeName={name} />
            </section>
          )}

          {/* Recent changes */}
          {showActivity && (
            <section id="activity" className="scroll-mt-28">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                    Recent changes
                  </h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Every time an EIP entered, left, or moved stages in this upgrade.
                  </p>
                </div>
                <CopyLinkButton sectionId="activity" className="h-7 w-7 rounded-md border border-border bg-muted/65 hover:border-primary/45 hover:bg-primary/10" />
              </div>
              <div className="overflow-hidden rounded-xl border border-border bg-card/60">
                <ul className="divide-y divide-border/60">
                  {events.slice(0, 25).map((event, index) => (
                    <li
                      key={`${event.commit_sha}-${event.eip_number}-${index}`}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm"
                    >
                      <GitCommit className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="w-20 shrink-0 text-xs text-muted-foreground">
                        {event.commit_date?.slice(0, 10) ?? '—'}
                      </span>
                      {event.eip_number ? (
                        <Link
                          href={`/eip/${event.eip_number}`}
                          className="font-mono text-xs font-semibold text-primary hover:underline"
                        >
                          EIP-{event.eip_number}
                        </Link>
                      ) : (
                        <span className="font-mono text-xs text-muted-foreground">—</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {event.event_type ?? 'changed'}
                      </span>
                      <StageBadge bucket={event.bucket} abbreviated />
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* Related articles */}
          {articles.length > 0 && (
            <section id="related-articles" className="scroll-mt-28">
              <UpgradeBlogCarousel posts={articles} upgradeName={name} />
            </section>
          )}

          {/* Subscription card for small screens (sidebar hidden) */}
          <div className="lg:hidden">
            <UpgradeSubscriptionCard slug={slug} name={name} />
          </div>
        </div>
      </div>
    </div>
  );
}
