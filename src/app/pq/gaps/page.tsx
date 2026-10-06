import { ArrowRight, ShieldAlert, UserX } from 'lucide-react';
import { PQ_GAPS } from '@/data/pq-registry';

export const revalidate = 300;

export default function PqGapsPage() {
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-card/60 p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-500" />
          <h2 className="text-sm font-bold tracking-tight text-foreground">Gaps &amp; Blockers</h2>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          The coordination problems made explicit, PQ roadmap capabilities that still lack an identified EIP, an owner,
          or a defined next step. This is the EIP Coordinator&apos;s action queue, not another green/yellow/red dashboard.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {PQ_GAPS.map((g) => (
          <section key={g.title} className="rounded-xl border border-amber-500/30 bg-amber-500/[0.04] p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">{g.title}</h3>
              <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                {g.milestone}
              </span>
            </div>

            <dl className="mt-3 space-y-1.5 text-xs">
              <Row label="Research">
                <span className={g.research === 'Available' ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}>{g.research}</span>
              </Row>
              <Row label="EIP">
                <span className="font-mono text-foreground">{g.eip}</span>
              </Row>
              <Row label="Champion">
                {g.champion ? (
                  <span className="text-foreground">{g.champion}</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <UserX className="h-3 w-3" /> none identified
                  </span>
                )}
              </Row>
            </dl>

            <div className="mt-3 flex items-start gap-2 rounded-lg border border-border bg-background/60 p-2.5">
              <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <p className="text-xs leading-relaxed text-foreground">
                <span className="font-semibold">Action needed:</span> {g.action}
              </p>
            </div>
          </section>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-muted/30 p-3 text-[12px] leading-relaxed text-muted-foreground">
        Turning EIPsInsight from a reporting site into a coordination tool: each gap names the missing piece and the next
        decision, so the state is maintainable and public. Curated metadata, corrections welcome at dev@avarch.org.
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <dt className="w-20 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}
