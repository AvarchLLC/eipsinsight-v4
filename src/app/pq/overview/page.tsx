import { Fragment } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ShieldAlert, Video, Boxes, CircleDot, GitFork, Link2Off, KeyRound, Layers, Map, BookOpen, Gauge } from 'lucide-react';
import { PQ_PIPELINE, PQ_PIPELINE_PHASES, pqSummary, PQ_EIPS, PQ_LAYERS, pqReadinessStage } from '@/data/pq-registry';
import { CopyLinkButton } from '@/components/header';

export const revalidate = 300;

// Plain-language glossary for the roles and inclusion stages used across the hub.
const KEY_TERMS: { term: string; def: string }[] = [
  { term: 'Post-quantum (PQ)', def: 'Cryptography designed to stay secure even against a large quantum computer, which could break today’s ECDSA / BLS signatures.' },
  { term: 'Direct PQ', def: 'An EIP that introduces post-quantum cryptography itself, e.g. a PQ signature scheme or precompile.' },
  { term: 'Enabler', def: 'An EIP that unlocks a PQ capability without being PQ crypto itself (e.g. account abstraction that lets PQ signatures be used).' },
  { term: 'Prerequisite', def: 'A change that must land before PQ migration can proceed, even if it isn’t PQ-specific.' },
  { term: 'PFI, CFI, SFI', def: 'Fork-inclusion stages: Proposed, Considered, then Scheduled for Inclusion. An EIP climbs these as client teams and ACD commit to it.' },
];

type PipeState = 'reached' | 'frontier' | 'ahead';

const bandClass: Record<PipeState, string> = {
  reached: 'border-emerald-500/25 bg-emerald-500/[0.05]',
  frontier: 'border-primary/40 bg-primary/[0.07]',
  ahead: 'border-border bg-muted/20',
};
const dotClass: Record<PipeState, string> = {
  reached: 'bg-emerald-500',
  frontier: 'bg-primary',
  ahead: 'bg-muted-foreground/40',
};
const pillClass: Record<PipeState, string> = {
  reached: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  frontier: 'border-primary/50 bg-primary/15 text-primary',
  ahead: 'border-border bg-card/60 text-muted-foreground',
};

const INDICATORS: {
  label: string;
  key: keyof ReturnType<typeof pqSummary>;
  icon: typeof Boxes;
  hint: string;
  /** Fuller plain-language explanation (tooltip). */
  info: string;
  href: string;
  alert?: boolean;
}[] = [
  { label: 'PQ-related EIPs', key: 'total', icon: Boxes, hint: 'Tracked in the registry', info: 'Every EIP in the PQ registry: direct PQ crypto, enablers, prerequisites and related work.', href: '/pq/eips' },
  { label: 'Direct PQ', key: 'direct', icon: ShieldAlert, hint: 'Introduce PQ cryptography', info: 'EIPs that add post-quantum cryptography itself (PQ signature schemes, precompiles, keystores).', href: '/pq/eips?role=Direct+PQ' },
  { label: 'Enabling EIPs', key: 'enablers', icon: GitFork, hint: 'Unlock a PQ capability', info: 'Not PQ crypto themselves, but required to use it, e.g. account abstraction / frame transactions.', href: '/pq/eips?role=Enabler' },
  { label: 'Migration prerequisites', key: 'prerequisites', icon: KeyRound, hint: 'Must land before migration', info: 'Changes that have to ship before PQ migration can proceed, even if not PQ-specific.', href: '/pq/eips?role=Prerequisite' },
  { label: 'In active upgrade', key: 'inUpgrade', icon: Layers, hint: 'CFI or beyond in a fork', info: 'PQ EIPs that are Considered/Scheduled for Inclusion (or deployed) in a network upgrade.', href: '/pq/eips' },
  { label: 'Roadmap gaps w/o EIP', key: 'roadmapNoEip', icon: Map, hint: 'Capability has no identified EIP', info: 'PQ roadmap capabilities that research covers but no EIP has been written for yet.', href: '/pq/roadmap', alert: true },
  { label: 'Open coordination gaps', key: 'gaps', icon: CircleDot, hint: 'Need an owner or next step', info: 'Coordination problems that still need an identified owner, champion, or defined next step.', href: '/pq/gaps', alert: true },
  { label: 'Unresolved dependencies', key: 'unresolvedDeps', icon: Link2Off, hint: 'Depend on an untracked EIP', info: 'PQ EIPs that require another EIP which is not yet in the registry.', href: '/pq/dependencies', alert: true },
];

export default function PqOverviewPage() {
  const s = pqSummary();

  return (
    <div className="space-y-4">
      {/* Positioning */}
      <section id="pq-positioning" className="scroll-mt-20 rounded-xl border border-border bg-card/60 p-5 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-3 lg:gap-8">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2">
              <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                Where the roadmap points, and how far the specs have come
              </h2>
              <CopyLinkButton sectionId="pq-positioning" className="h-7 w-7 shrink-0" />
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">Post-quantum (PQ)</span> cryptography (increasingly framed under{' '}
              <span className="font-medium text-foreground">PQAI</span> to account for both quantum computers and AI-driven cryptanalysis)
              is designed to stay secure against threats that could break the ECDSA and BLS signatures Ethereum relies on today.
              Ethereum&apos;s PQ roadmap says <span className="font-medium text-foreground">where</span>{' '}
              the protocol needs to go; this hub tracks <span className="font-medium text-foreground">how</span> the EIPs
              and specifications to get there are progressing: their roadmap milestone, dependencies, upgrade status,
              and the open coordination gaps between research and shipped protocol changes.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href="https://pq.ethereum.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
              >
                PQ roadmap (pq.ethereum.org) <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
              <Link
                href="/calls/pqts"
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <Video className="h-3.5 w-3.5" /> PQTS breakout calls
              </Link>
            </div>
          </div>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 lg:col-span-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Coordinator focus</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">
              {s.gaps + s.roadmapNoEip} open gaps
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              roadmap capabilities and coordination problems that still need an identified EIP, owner, or next step. See{' '}
              <Link href="/pq/gaps" className="font-medium text-primary hover:underline">Gaps &amp; Blockers</Link>.
            </p>
          </div>
        </div>
      </section>

      {/* Indicators, each box links to the EIPs/gaps behind the number */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {INDICATORS.map((ind, i) => {
          const flagged = ind.alert && s[ind.key] > 0;
          return (
            <Link
              key={ind.label}
              href={ind.href}
              title={ind.info}
              style={{ animationDelay: `${i * 45}ms` }}
              className={
                'group relative flex flex-col gap-1.5 rounded-xl border p-4 shadow-sm transition-all duration-200 ' +
                'animate-in fade-in slide-in-from-bottom-2 fill-mode-both hover:-translate-y-0.5 hover:shadow-md ' +
                (flagged
                  ? 'border-amber-500/30 bg-amber-500/[0.06] hover:border-amber-500/50 hover:bg-amber-500/10'
                  : 'border-border bg-card/60 hover:border-primary/40 hover:bg-primary/[0.04]')
              }
            >
              <div className="flex items-center justify-between">
                <span
                  className={
                    'flex h-7 w-7 items-center justify-center rounded-lg ' +
                    (flagged ? 'bg-amber-500/15 text-amber-500' : 'bg-primary/10 text-primary')
                  }
                >
                  <ind.icon className="h-4 w-4" />
                </span>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground/30 transition-colors group-hover:text-primary" />
              </div>
              <p className="text-3xl font-bold tabular-nums leading-none tracking-tight text-foreground">{s[ind.key]}</p>
              <div>
                <p className="text-sm font-semibold leading-tight text-foreground">{ind.label}</p>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{ind.hint}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Readiness pipeline */}
      <section id="pq-pipeline" className="scroll-mt-20 rounded-xl border border-border bg-card/60 p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold tracking-tight text-foreground sm:text-lg">PQ readiness pipeline</h3>
          <CopyLinkButton sectionId="pq-pipeline" className="h-6 w-6" />
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          The path every PQ capability travels from research to ecosystem-wide migration, grouped by phase. Most work
          today sits in research, specification and early standardization (PFI/CFI); the earliest proposals, like{' '}
          <Link href="/eip/8141" className="font-medium text-primary hover:underline">EIP-8141</Link>, are already in
          client implementation and on devnets.
        </p>

        {(() => {
          // Curated readiness meter: how far the PQ frontier has reached.
          const stageState = (i: number): PipeState => (i <= 4 ? 'reached' : i <= 6 ? 'frontier' : 'ahead');
          const indexed = PQ_PIPELINE.map((s, i) => ({ ...s, i, state: stageState(i) }));
          const groups = PQ_PIPELINE_PHASES.map((phase) => ({
            phase,
            stages: indexed.filter((s) => s.phase === phase),
          })).filter((g) => g.stages.length > 0);

          return (
            <div className="mt-4 flex flex-col gap-2.5 lg:flex-row lg:items-stretch">
              {groups.map((g, gi) => {
                const state = g.stages[0]!.state;
                return (
                  <Fragment key={g.phase}>
                    <div
                      style={{ animationDelay: `${gi * 90}ms` }}
                      className={
                        'flex-1 animate-in fade-in slide-in-from-bottom-2 fill-mode-both rounded-xl border p-3 transition-shadow ' +
                        bandClass[state] +
                        (state === 'frontier' ? ' ring-1 ring-primary/25' : '')
                      }
                    >
                      <div className="mb-2 flex items-center gap-1.5">
                        <span className={'h-2 w-2 rounded-full ' + dotClass[state] + (state === 'frontier' ? ' animate-pulse' : '')} />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{g.phase}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {g.stages.map((st) => (
                          <span
                            key={st.label}
                            className={'inline-flex flex-col rounded-lg border px-2.5 py-1 ' + pillClass[st.state]}
                            title={st.full}
                          >
                            <span className="text-xs font-semibold leading-tight">{st.label}</span>
                            {st.full && <span className="text-[10px] font-normal leading-tight opacity-70">{st.full}</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                    {gi < groups.length - 1 && (
                      <div className="flex items-center justify-center text-primary/50 lg:px-1">
                        <span className="pq-arrow-anim hidden text-base lg:inline">→</span>
                        <span className="pq-arrow-anim text-base lg:hidden">↓</span>
                      </div>
                    )}
                  </Fragment>
                );
              })}
            </div>
          );
        })()}

        <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> reached</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> current frontier</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-muted-foreground/40" /> ahead</span>
        </div>
      </section>

      {/* Readiness scorecard — where each tracked spec sits on the pipeline */}
      <section id="pq-scorecard" className="scroll-mt-20 overflow-hidden rounded-xl border border-border bg-card/60">
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold tracking-tight text-foreground sm:text-lg">Readiness scorecard</h2>
            <CopyLinkButton sectionId="pq-scorecard" className="h-6 w-6" />
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Where each tracked PQ specification sits on the{' '}
            <a href="#pq-pipeline" className="font-medium text-primary hover:underline">pipeline</a>, from research to
            ecosystem migration. Derived conservatively from fork-inclusion status, client implementations, and testnet presence.
          </p>
        </div>
        {PQ_LAYERS.map((layer) => {
          const eips = PQ_EIPS.filter((e) => e.layer === layer);
          if (eips.length === 0) return null;
          return (
            <div key={layer} className="border-t border-border">
              <div className="bg-muted/30 px-5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {layer}
              </div>
              {eips.map((e) => {
                const stage = pqReadinessStage(e);
                return (
                  <div key={e.number} className="border-t border-border/50 px-5 py-3 first:border-t-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="flex min-w-0 items-baseline gap-2">
                        <Link href={`/eips/eip-${e.number}`} className="shrink-0 font-mono text-xs font-semibold text-primary hover:underline">
                          {e.number}
                        </Link>
                        <span className="truncate text-sm text-foreground">{e.title}</span>
                      </div>
                      <span className="shrink-0 whitespace-nowrap text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        {PQ_PIPELINE[stage].label}
                      </span>
                    </div>
                    <div className="mt-2 flex gap-0.5" role="img" aria-label={`Stage: ${PQ_PIPELINE[stage].label}`}>
                      {PQ_PIPELINE.map((st, i) => (
                        <span
                          key={i}
                          title={st.label}
                          className={
                            'h-1.5 flex-1 rounded-full ' +
                            (i < stage ? 'bg-emerald-500/70' : i === stage ? 'bg-primary' : 'bg-muted')
                          }
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
        <div className="border-t border-border/60 bg-muted/20 px-5 py-3 text-xs leading-relaxed text-muted-foreground">
          Stages are conservative snapshots. The live status of each proposal is on its{' '}
          <Link href="/standards" className="text-primary hover:underline">EIP page</Link>; testnet state comes from the PQTS breakout.
        </div>
      </section>

      {/* Key terms — plain-language glossary */}
      <section id="pq-terms" className="scroll-mt-20 rounded-xl border border-border bg-card/60 p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <h3 className="text-base font-bold tracking-tight text-foreground sm:text-lg">Key terms</h3>
          <CopyLinkButton sectionId="pq-terms" className="h-6 w-6" />
        </div>
        <p className="mt-1.5 text-sm text-muted-foreground">What the roles and stages used across this hub mean.</p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {KEY_TERMS.map((t) => (
            <div key={t.term} className="rounded-lg border border-border bg-background/40 p-3.5">
              <dt className="text-sm font-semibold text-foreground">{t.term}</dt>
              <dd className="mt-1 text-xs leading-relaxed text-muted-foreground">{t.def}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
        Curated coordinator metadata, cross-referencing the PQ roadmap and the EIP repository. Live EIP status is on each{' '}
        <span className="font-mono">/eip/&lt;number&gt;</span> page. Some fields may be inferred; corrections welcome at dev@avarch.org.
      </div>
    </div>
  );
}
