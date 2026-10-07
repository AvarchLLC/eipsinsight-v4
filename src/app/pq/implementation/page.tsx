import Link from 'next/link';
import { ArrowUpRight, FlaskConical, KeyRound, Radio, Video } from 'lucide-react';
import {
  PQ_EIPS,
  PQ_EL_CLIENTS,
  PQ_CL_CLIENTS,
  IMPL_STATE_ORDER,
  IMPL_STATE_LABEL,
  implFor,
  PQTS_TESTNET,
  PQ_SCHEMES,
  type ImplState,
} from '@/data/pq-registry';
import { DaisugiPanel } from '@/components/pq/daisugi-panel';

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
          spec to running code across the relevant clients, the measurable bridge between the EIP and upgrade readiness.
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

      {/* PQTS research testnet (from the PQTS breakout calls) */}
      <section className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-bold tracking-tight text-foreground">
            <FlaskConical className="h-4 w-4 text-blue-500" /> PQTS research testnet
          </h3>
          <Link href={PQTS_TESTNET.callsHref} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            <Video className="h-3.5 w-3.5" /> PQTS breakout calls
          </Link>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          End-to-end PQ signatures exercised on a live research testnet. Chaired by {PQTS_TESTNET.chair}; contributors: {PQTS_TESTNET.contributors.join(', ')}.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {PQTS_TESTNET.phases.map((p) => (
            <div key={p.version} className="rounded-lg border border-border bg-background/60 p-3.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-foreground">{p.version}</span>
                <span
                  className={
                    'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ' +
                    (p.status === 'live'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : p.status === 'in-progress'
                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                        : 'border-border bg-muted/50 text-muted-foreground')
                  }
                >
                  {p.status === 'live' && <Radio className="h-2.5 w-2.5" />}
                  {p.status === 'live' ? 'live' : p.status === 'in-progress' ? 'in progress' : 'planned'}
                </span>
              </div>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">{p.summary}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {p.eips.map((n) => (
                  <Link key={n} href={`/eip/${n}`} className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary hover:bg-primary/15">
                    EIP-{n}
                  </Link>
                ))}
                {p.schemes.map((s) => (
                  <span key={s} className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground">{s}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Live Daisugi testnet telemetry, proxied from explorer.daisugi.fyi */}
      <DaisugiPanel />

      {/* PQ signature schemes in play */}
      <section className="rounded-xl border border-border bg-card/60 p-4 sm:p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold tracking-tight text-foreground">
          <KeyRound className="h-4 w-4 text-primary" /> PQ signature schemes in play
        </h3>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {PQ_SCHEMES.map((s) => (
            <div key={s.name} className="rounded-lg border border-border bg-background/60 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs font-semibold text-foreground">{s.name}</span>
                <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground">{s.family}</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground"><span className="font-medium text-foreground/80">{s.use}.</span> {s.note}</p>
            </div>
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
