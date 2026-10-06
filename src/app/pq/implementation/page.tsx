import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import {
  PQ_EIPS,
  PQ_EL_CLIENTS,
  PQ_CL_CLIENTS,
  IMPL_STATE_ORDER,
  IMPL_STATE_LABEL,
  implFor,
  type ImplState,
} from '@/data/pq-registry';

export const revalidate = 300;

const stateClass: Record<ImplState, string> = {
  'not-started': 'bg-muted/50 text-muted-foreground border-border',
  planned: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
  'pr-open': 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30',
  implemented: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
  interoperable: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30',
  tested: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
};

const shortLabel: Record<ImplState, string> = {
  'not-started': '—',
  planned: 'Planned',
  'pr-open': 'PR',
  implemented: 'Impl',
  interoperable: 'Interop',
  tested: 'Tested',
};

function Cell({ eip, client }: { eip: number; client: string }) {
  const impl = implFor(eip, client);
  const chip = (
    <span className={`inline-block rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${stateClass[impl.state]}`}>
      {shortLabel[impl.state]}
    </span>
  );
  return (
    <td className="px-2 py-2.5 text-center">
      {impl.url ? (
        <a href={impl.url} target="_blank" rel="noopener noreferrer" title={IMPL_STATE_LABEL[impl.state]}>
          {chip}
        </a>
      ) : (
        <span title={IMPL_STATE_LABEL[impl.state]}>{chip}</span>
      )}
    </td>
  );
}

function Matrix({ title, clients, eips }: { title: string; clients: readonly string[]; eips: typeof PQ_EIPS }) {
  if (eips.length === 0) return null;
  const cols = [...clients, 'Devnet'];
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card/60">
      <div className="border-b border-border px-4 py-2.5">
        <h3 className="text-sm font-bold tracking-tight text-foreground">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2.5 text-left font-semibold">EIP</th>
              {cols.map((c) => (
                <th key={c} className="px-2 py-2.5 text-center font-semibold">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {eips.map((e) => (
              <tr key={e.number} className="transition-colors hover:bg-muted/40">
                <td className="px-4 py-2.5 align-middle">
                  <Link href={`/eip/${e.number}`} className="inline-flex items-center gap-1 font-mono text-xs font-bold text-primary hover:underline">
                    {e.number} <ArrowUpRight className="h-3 w-3" />
                  </Link>
                  <div className="text-[11px] text-muted-foreground">{e.capability}</div>
                </td>
                {cols.map((c) => (
                  <Cell key={c} eip={e.number} client={c} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function PqImplementationPage() {
  const elEips = PQ_EIPS.filter((e) => e.layer === 'Execution' || e.layer === 'Data');
  const clEips = PQ_EIPS.filter((e) => e.layer === 'Consensus');

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-card/60 p-5 sm:p-6">
        <h2 className="text-sm font-bold tracking-tight text-foreground">Implementation &amp; Devnet matrix</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          EIP status alone doesn&apos;t tell you whether PQ work is becoming deployable. This tracks each proposal from
          spec to running code across the relevant clients — the measurable bridge between the EIP and upgrade readiness.
          Most PQ consensus work is early-stage, so the frontier is deliberately visible.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {IMPL_STATE_ORDER.map((s) => (
            <span key={s} className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold ${stateClass[s]}`}>
              {IMPL_STATE_LABEL[s]}
            </span>
          ))}
        </div>
      </section>

      <Matrix title="Execution-layer PQ EIPs" clients={PQ_EL_CLIENTS} eips={elEips} />
      <Matrix title="Consensus-layer PQ EIPs" clients={PQ_CL_CLIENTS} eips={clEips} />

      <div className="rounded-xl border border-border bg-muted/30 p-3 text-[12px] leading-relaxed text-muted-foreground">
        Curated from client PRs, the frames-devnet test suite, and ACD updates. Cells link to the implementation PR where
        one exists. This creates a bridge between EIP specification and Forkcast-style upgrade readiness without
        duplicating either. Corrections welcome at dev@avarch.org.
      </div>
    </div>
  );
}
