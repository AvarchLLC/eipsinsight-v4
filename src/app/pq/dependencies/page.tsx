import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight, Link2Off, Network } from 'lucide-react';
import { PQ_EIPS } from '@/data/pq-registry';
import { PqDependencyGraph } from '@/components/pq/dependency-graph';
import { CopyLinkButton } from '@/components/header';

export const revalidate = 300;

function known(n: number) {
  return PQ_EIPS.find((e) => e.number === n);
}

function EipChip({ n }: { n: number }) {
  const k = known(n);
  return (
    <Link
      href={`/eip/${n}`}
      title={k?.title}
      className={
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[11px] font-semibold transition-colors ' +
        (k
          ? 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/15'
          : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300')
      }
    >
      EIP-{n}
      {!k && <Link2Off className="h-3 w-3" aria-label="not yet in the registry" />}
    </Link>
  );
}

export default function PqDependenciesPage() {
  // Build reverse edges (who requires me) so each node can show both directions.
  const requiredBy = new Map<number, number[]>();
  for (const e of PQ_EIPS) {
    for (const d of e.dependsOn ?? []) {
      requiredBy.set(d, [...(requiredBy.get(d) ?? []), e.number]);
    }
  }

  return (
    <div className="space-y-4">
      <section id="pq-dependencies" className="scroll-mt-20 overflow-hidden rounded-xl border border-border bg-card/60">
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold tracking-tight text-foreground sm:text-lg">PQ dependency map</h2>
            <CopyLinkButton sectionId="pq-dependencies" className="h-6 w-6" />
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            How PQ proposals depend on and enable each other. <span className="font-medium text-foreground">Requires</span>{' '}
            is a hard specification dependency; <span className="font-medium text-foreground">enables</span> unlocks a
            downstream capability. A dependency on an EIP not yet in the registry is flagged.
          </p>
        </div>
        <div className="border-t border-border">
          <PqDependencyGraph />
        </div>
      </section>

      <h3 className="px-1 pt-2 text-base font-bold tracking-tight text-foreground sm:text-lg">All relationships</h3>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {PQ_EIPS.map((e) => {
          const enables = e.enables ?? [];
          const requires = e.dependsOn ?? [];
          const usedBy = requiredBy.get(e.number) ?? [];
          return (
            <section key={e.number} className="rounded-xl border border-border bg-card/60 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/eip/${e.number}`} className="inline-flex items-center gap-1.5 font-mono text-sm font-bold text-primary hover:underline">
                  EIP-{e.number} <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
                <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground">
                  {e.capability} · {e.milestone}
                </span>
              </div>
              <p className="mt-1 text-sm font-medium text-foreground">{e.title}</p>

              <div className="mt-3 space-y-2 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                    <ArrowDownRight className="h-3 w-3" /> requires
                  </span>
                  {requires.length ? requires.map((n) => <EipChip key={n} n={n} />) : <span className="text-muted-foreground">nothing</span>}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                    <ArrowUpRight className="h-3 w-3" /> enables
                  </span>
                  {enables.length ? enables.map((n) => <EipChip key={n} n={n} />) : <span className="text-muted-foreground">nothing</span>}
                </div>
                {usedBy.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-muted-foreground">required by</span>
                    {usedBy.map((n) => <EipChip key={n} n={n} />)}
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
