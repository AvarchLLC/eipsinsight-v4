import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, CircleHelp, GitBranch, Map } from 'lucide-react';
import { PQ_ROADMAP, PQ_POSITIONS } from '@/data/pq-registry';
import { CopyLinkButton } from '@/components/header';

export const revalidate = 300;

export default function PqRoadmapPage() {
  return (
    <div className="space-y-4">
      {/* Roadmap positions: competing views on the PQ timeline and path. */}
      <section id="pq-positions" className="scroll-mt-20 space-y-3">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold tracking-tight text-foreground sm:text-lg">Roadmap positions</h2>
          <CopyLinkButton sectionId="pq-positions" className="h-6 w-6" />
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Competing views on how fast, and via which path, Ethereum reaches post-quantum security. These are positions and
          proposals, <span className="font-medium text-foreground">not EIPs and not settled consensus</span>. PQ-ready means
          Ethereum can switch to PQ mechanisms and keep operating; PQ-scaled means full capacity on PQ transactions and data.
        </p>
        <div className="grid gap-3 lg:grid-cols-3">
          {PQ_POSITIONS.map((p) => (
            <div key={p.id} className="flex flex-col rounded-xl border border-border bg-card/60 p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {p.kind}
                </span>
                <span
                  className={
                    'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ' +
                    (p.status === 'Under discussion'
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      : p.status === 'Reference'
                        ? 'border-primary/30 bg-primary/10 text-primary'
                        : 'border-border bg-muted/40 text-muted-foreground')
                  }
                >
                  {p.status}
                </span>
              </div>
              <h3 className="text-sm font-semibold leading-snug text-foreground">{p.title}</h3>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{p.author}</p>
              {p.target && <p className="mt-2 text-sm font-medium text-primary">{p.target}</p>}
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{p.summary}</p>
              {p.changes && (
                <ul className="mt-2 space-y-1">
                  {p.changes.map((c, i) => (
                    <li key={i} className="flex gap-1.5 text-[11px] leading-snug text-muted-foreground">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/60" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              )}
              {p.neutralityNote && (
                <p className="mt-2 rounded-md border border-border bg-muted/30 px-2 py-1.5 text-[10px] italic leading-snug text-muted-foreground">
                  {p.neutralityNote}
                </p>
              )}
              {(p.discussionsTo || p.writeup) && (
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-border/60 pt-2.5">
                  {p.discussionsTo && (
                    <a href={p.discussionsTo} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline">
                      Discussion <ArrowUpRight className="h-3 w-3" />
                    </a>
                  )}
                  {p.writeup && (
                    <a href={p.writeup} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground">
                      Write-up <ArrowUpRight className="h-3 w-3" />
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

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
