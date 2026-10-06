import Link from 'next/link';
import { ArrowUpRight, ShieldAlert, Video, Boxes, CircleDot, GitFork, Link2Off, KeyRound, Layers, Map } from 'lucide-react';
import { PQ_PIPELINE, pqSummary } from '@/data/pq-registry';

export const revalidate = 300;

const INDICATORS: { label: string; key: keyof ReturnType<typeof pqSummary>; icon: typeof Boxes; hint: string; alert?: boolean }[] = [
  { label: 'PQ-related EIPs', key: 'total', icon: Boxes, hint: 'Tracked in the registry' },
  { label: 'Direct PQ', key: 'direct', icon: ShieldAlert, hint: 'Introduce PQ cryptography' },
  { label: 'Enabling EIPs', key: 'enablers', icon: GitFork, hint: 'Unlock a PQ capability' },
  { label: 'Migration prerequisites', key: 'prerequisites', icon: KeyRound, hint: 'Must land before migration' },
  { label: 'In active upgrade', key: 'inUpgrade', icon: Layers, hint: 'CFI or beyond in a fork' },
  { label: 'Roadmap gaps w/o EIP', key: 'roadmapNoEip', icon: Map, hint: 'Capability has no identified EIP', alert: true },
  { label: 'Open coordination gaps', key: 'gaps', icon: CircleDot, hint: 'Need an owner or next step', alert: true },
  { label: 'Unresolved dependencies', key: 'unresolvedDeps', icon: Link2Off, hint: 'Depend on an untracked EIP', alert: true },
];

export default function PqOverviewPage() {
  const s = pqSummary();

  return (
    <div className="space-y-4">
      {/* Positioning */}
      <section className="rounded-xl border border-border bg-card/60 p-5 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-3 lg:gap-8">
          <div className="lg:col-span-2">
            <h2 className="dec-title text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              How ready is Ethereum for post-quantum migration?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Ethereum&apos;s PQ roadmap says <span className="font-medium text-foreground">where</span> the protocol
              needs to go for quantum resistance. This hub tracks <span className="font-medium text-foreground">how</span>{' '}
              the EIPs and specifications required to get there are progressing — their roadmap milestone, dependencies,
              upgrade status, and the open coordination gaps between research and shipped protocol changes.
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
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Coordinator focus</p>
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

      {/* Indicators */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {INDICATORS.map((ind) => (
          <div
            key={ind.label}
            className={
              'rounded-lg border p-3.5 ' +
              (ind.alert && s[ind.key] > 0
                ? 'border-amber-500/30 bg-amber-500/5'
                : 'border-border bg-card/60')
            }
          >
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <ind.icon className={'h-3.5 w-3.5 ' + (ind.alert && s[ind.key] > 0 ? 'text-amber-500' : 'text-primary')} />
              {ind.label}
            </div>
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-foreground">{s[ind.key]}</p>
            <p className="text-[10px] text-muted-foreground">{ind.hint}</p>
          </div>
        ))}
      </div>

      {/* Readiness pipeline */}
      <section className="rounded-xl border border-border bg-card/60 p-5 sm:p-6">
        <h3 className="text-sm font-bold tracking-tight text-foreground">PQ readiness pipeline</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          The path every PQ capability travels from research to ecosystem-wide migration. Most PQ work today sits in the
          first stages — research and specification — with the earliest proposals reaching ACD and implementation.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {PQ_PIPELINE.map((stage, i) => {
            // Rough "how far the frontier has reached" shading for the readiness meter.
            const reached = i <= 3; // Research → EIP → ACD reached; implementation+ is the frontier
            const frontier = i === 4;
            return (
              <div key={stage} className="flex items-center gap-1.5">
                <span
                  className={
                    'rounded-md border px-2.5 py-1 text-[11px] font-medium ' +
                    (frontier
                      ? 'border-primary/50 bg-primary/15 text-primary'
                      : reached
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                        : 'border-border bg-muted/40 text-muted-foreground')
                  }
                >
                  {stage}
                </span>
                {i < PQ_PIPELINE.length - 1 && <span className="text-muted-foreground/40">→</span>}
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-emerald-500" /> reached</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-primary" /> current frontier</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-muted-foreground/30" /> ahead</span>
        </div>
      </section>

      <div className="rounded-xl border border-border bg-muted/30 p-3 text-[12px] leading-relaxed text-muted-foreground">
        Curated coordinator metadata, cross-referencing the PQ roadmap and the EIP repository. Live EIP status is on each{' '}
        <span className="font-mono">/eip/&lt;number&gt;</span> page. Some fields may be inferred; corrections welcome at dev@avarch.org.
      </div>
    </div>
  );
}
