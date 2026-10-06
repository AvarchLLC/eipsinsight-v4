import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, CircleHelp } from 'lucide-react';
import { PQ_ROADMAP } from '@/data/pq-registry';

export const revalidate = 300;

export default function PqRoadmapPage() {
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-card/60 p-5 sm:p-6">
        <h2 className="text-sm font-bold tracking-tight text-foreground">Roadmap × EIP coverage</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          For every capability on Ethereum&apos;s PQ roadmap: does the protocol specification needed to implement it
          exist yet? The <span className="font-medium text-amber-600 dark:text-amber-400">gap</span> cells are where the
          research milestone has no identified EIP, the coordination work.
        </p>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card/60">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5 font-semibold">Milestone</th>
                <th className="px-4 py-2.5 font-semibold">Capability</th>
                <th className="px-4 py-2.5 font-semibold">Research</th>
                <th className="px-4 py-2.5 font-semibold">EIP</th>
                <th className="px-4 py-2.5 font-semibold">Gap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {PQ_ROADMAP.map((r, i) => {
                const isGap = r.eip === '?' || r.eip === 'TBD';
                return (
                  <tr key={i} className="transition-colors hover:bg-muted/40">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground">{r.milestone}</td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{r.capability}</td>
                    <td className="px-4 py-3 text-xs">
                      {r.research === 'Available' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Available
                        </span>
                      ) : (
                        <span className="text-muted-foreground">{r.research}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {typeof r.eip === 'number' ? (
                        <Link href={`/eip/${r.eip}`} className="inline-flex items-center gap-1 font-mono font-semibold text-primary hover:underline">
                          EIP-{r.eip} <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      ) : r.eip === 'Spec' ? (
                        <span className="font-mono text-muted-foreground">Spec only</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-mono font-semibold text-amber-600 dark:text-amber-400">
                          <CircleHelp className="h-3.5 w-3.5" /> none
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {r.gap ? (
                        <span className={'rounded-full border px-2 py-0.5 text-[10px] font-semibold ' + (isGap ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'border-border bg-muted/50 text-muted-foreground')}>
                          {r.gap}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="rounded-xl border border-border bg-muted/30 p-3 text-[12px] leading-relaxed text-muted-foreground">
        Reads alongside <a href="https://pq.ethereum.org/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">pq.ethereum.org</a>:
        the roadmap defines the capabilities; this table tracks whether each one has the EIP it needs. Unresolved rows feed{' '}
        <Link href="/pq/gaps" className="text-primary hover:underline">Gaps &amp; Blockers</Link>.
      </div>
    </div>
  );
}
