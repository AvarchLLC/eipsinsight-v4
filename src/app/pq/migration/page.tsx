import Link from 'next/link';
import { Boxes, Users } from 'lucide-react';
import {
  PQ_MIGRATION,
  READINESS_LABEL,
  READINESS_ORDER,
  type MigrationCategory,
  type ReadinessLevel,
} from '@/data/pq-registry';

export const revalidate = 300;

const readinessClass: Record<ReadinessLevel, string> = {
  none: 'bg-muted/50 text-muted-foreground border-border',
  research: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
  spec: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30',
  'in-progress': 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
  ready: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
};

function Group({ title, icon: Icon, blurb, rows }: { title: string; icon: typeof Boxes; blurb: string; rows: MigrationCategory[] }) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card/60">
      <div className="border-b border-border px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-bold tracking-tight text-foreground">
          <Icon className="h-4 w-4 text-primary" /> {title}
        </h3>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{blurb}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2.5 font-semibold">Category</th>
              <th className="px-4 py-2.5 font-semibold">Current</th>
              <th className="px-4 py-2.5 font-semibold">PQ candidate</th>
              <th className="px-4 py-2.5 font-semibold">Relevant EIPs</th>
              <th className="px-4 py-2.5 font-semibold">Readiness</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((c) => (
              <tr key={c.name} className="align-top transition-colors hover:bg-muted/40">
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{c.name}</div>
                  {c.note && <div className="mt-0.5 max-w-xs text-[11px] leading-relaxed text-muted-foreground">{c.note}</div>}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{c.current}</td>
                <td className="px-4 py-3 text-xs text-foreground">{c.pqCandidate}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {c.eips.length ? (
                      c.eips.map((n) => (
                        <Link key={n} href={`/eip/${n}`} className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary hover:bg-primary/15">
                          {n}
                        </Link>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-semibold ${readinessClass[c.readiness]}`}>
                    {READINESS_LABEL[c.readiness]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function PqMigrationPage() {
  const protocol = PQ_MIGRATION.filter((c) => c.group === 'Protocol');
  const ecosystem = PQ_MIGRATION.filter((c) => c.group === 'Ecosystem');

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-card/60 p-5 sm:p-6">
        <h2 className="text-sm font-bold tracking-tight text-foreground">PQ migration tracker</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Ethereum can deploy PQ support at the protocol while the ecosystem stays on vulnerable keys. This tracks
          readiness by <span className="font-medium text-foreground">category</span> — protocol-controlled versus
          ecosystem-dependent — rather than declaring any organization &quot;quantum safe&quot;. It grows as the roadmap
          matures.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {READINESS_ORDER.map((r) => (
            <span key={r} className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold ${readinessClass[r]}`}>
              {READINESS_LABEL[r]}
            </span>
          ))}
        </div>
      </section>

      <Group
        title="Protocol readiness"
        icon={Boxes}
        blurb="Cryptography the core protocol controls — validators, aggregation, randomness."
        rows={protocol}
      />
      <Group
        title="Ecosystem readiness"
        icon={Users}
        blurb="Where migration needs action beyond the core protocol — accounts, wallets, and the wider stack."
        rows={ecosystem}
      />

      <div className="rounded-xl border border-border bg-muted/30 p-3 text-[12px] leading-relaxed text-muted-foreground">
        The protocol can be PQ-ready before the ecosystem is — this layer makes that gap explicit so it can be tracked
        over the multi-year migration. Curated metadata; corrections welcome at dev@avarch.org.
      </div>
    </div>
  );
}
