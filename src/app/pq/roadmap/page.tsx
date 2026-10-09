import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, CircleHelp, Map } from 'lucide-react';
import { PQ_ROADMAP } from '@/data/pq-registry';
import { CopyLinkButton } from '@/components/header';

export const revalidate = 300;

export default function PqRoadmapPage() {
  return (
    <div className="space-y-4">
      {/* One seamless card: header -> table -> footnote, divided by subtle lines. */}
      <section id="pq-roadmap" className="scroll-mt-20 overflow-hidden rounded-xl border border-border bg-card/60">
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Map className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold tracking-tight text-foreground sm:text-lg">Roadmap &times; EIP coverage</h2>
            <CopyLinkButton sectionId="pq-roadmap" className="h-6 w-6" />
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            For every capability on Ethereum&apos;s PQ roadmap: does the protocol specification needed to implement it
            exist yet? The <span className="font-medium text-amber-600 dark:text-amber-400">gap</span> cells are where
            the research milestone has no identified EIP, the coordination work.
          </p>
        </div>

        <div className="overflow-x-auto border-t border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 font-semibold">Milestone</th>
                <th className="px-5 py-3 font-semibold">Capability</th>
                <th className="px-5 py-3 font-semibold">Research</th>
                <th className="px-5 py-3 font-semibold">EIP</th>
                <th className="px-5 py-3 font-semibold">Gap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {PQ_ROADMAP.map((r, i) => {
                const isGap = r.eip === '?' || r.eip === 'TBD';
                return (
                  <tr key={i} className="transition-colors hover:bg-muted/30">
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-foreground">{r.milestone}</td>
                    <td className="px-5 py-3 text-sm font-medium text-foreground">{r.capability}</td>
                    <td className="px-5 py-3 text-xs">
                      {r.research === 'Available' ? (
                        <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Available
                        </span>
                      ) : (
                        <span className="text-muted-foreground">{r.research}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs">
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
                    <td className="px-5 py-3 text-xs">
                      {r.gap ? (
                        <span
                          className={
                            'rounded-full border px-2 py-0.5 text-[11px] font-semibold ' +
                            (isGap
                              ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                              : 'border-border bg-muted/50 text-muted-foreground')
                          }
                        >
                          {r.gap}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/60">No gap</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="border-t border-border/60 bg-muted/20 px-5 py-3 text-xs leading-relaxed text-muted-foreground">
          Reads alongside{' '}
          <a href="https://pq.ethereum.org/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">pq.ethereum.org</a>:
          the roadmap defines the capabilities; this table tracks whether each one has the EIP it needs. Unresolved rows
          feed <Link href="/pq/gaps" className="text-primary hover:underline">Gaps &amp; Blockers</Link>.
        </div>
      </section>
    </div>
  );
}
