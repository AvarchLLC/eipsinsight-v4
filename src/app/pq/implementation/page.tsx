import Link from 'next/link';
import { ArrowUpRight, FlaskConical, KeyRound, Radio, Server, Video } from 'lucide-react';
import { prisma } from '@/lib/prisma';
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
import { CopyLinkButton } from '@/components/header';

export const revalidate = 300;

interface DoraEpoch {
  epoch: number;
  finalized: boolean;
  validators: number;
  vote_participation: number;
  proposed_blocks: number;
  missed_blocks: number;
}

interface DoraHealth {
  epoch: number;
  finalized: boolean;
  validators: number;
  participationPct: number;
  proposed: number;
  missed: number;
  clients: string[];
}

async function fetchDoraHealth(devnetId: string): Promise<DoraHealth | null> {
  const base = `https://dora.${devnetId}.ethpandaops.io/api/v1`;
  try {
    const [epRes, slRes] = await Promise.all([
      fetch(`${base}/epochs?limit=2`, { signal: AbortSignal.timeout(3500), next: { revalidate: 300 } }),
      fetch(`${base}/slots?limit=32`, { signal: AbortSignal.timeout(3500), next: { revalidate: 300 } }),
    ]);
    if (!epRes.ok) return null;
    const epJson = (await epRes.json()) as { data?: { epochs?: DoraEpoch[] } };
    const epochs = epJson?.data?.epochs ?? [];
    const current = epochs[0];
    const completed = epochs[1] ?? current;
    if (!current) return null;

    let clients: string[] = [];
    if (slRes.ok) {
      const slJson = (await slRes.json()) as { data?: { slots?: { proposer_name?: string; status?: string }[] } };
      const set = new Set<string>();
      for (const sl of slJson?.data?.slots ?? []) {
        if (!sl.proposer_name || sl.status === 'Missed') continue;
        set.add(sl.proposer_name.replace(/-\d+$/, ''));
      }
      clients = [...set].sort();
    }

    const rawPart = completed?.vote_participation ?? 0;
    const participationPct = rawPart <= 1 ? Math.round(rawPart * 1000) / 10 : Math.round(rawPart * 10) / 10;

    return {
      epoch: current.epoch,
      finalized: current.finalized,
      validators: current.validators ?? 0,
      participationPct,
      proposed: completed?.proposed_blocks ?? current.proposed_blocks ?? 0,
      missed: completed?.missed_blocks ?? current.missed_blocks ?? 0,
      clients,
    };
  } catch {
    return null;
  }
}

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
  // "not-started" is the common case — render it as a faint dot so the eye
  // lands on real progress instead of a wall of identical chips.
  if (impl.state === 'not-started') {
    return (
      <td className="px-2 py-2.5 text-center">
        <span className="text-muted-foreground/30" title={IMPL_STATE_LABEL['not-started']}>
          ·
        </span>
      </td>
    );
  }
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

/** A matrix rendered as a seamless sub-section (no own card border). */
function Matrix({ title, clients, eips }: { title: string; clients: readonly string[]; eips: typeof PQ_EIPS }) {
  if (eips.length === 0) return null;
  const cols = [...clients, 'Devnet'];
  return (
    <div className="border-t border-border pt-4">
      <h3 className="px-5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="mt-2 overflow-x-auto px-3 pb-1">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border/70 text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-2 py-2 text-left font-semibold">EIP</th>
              {cols.map((c) => (
                <th key={c} className="px-2 py-2 text-center font-semibold">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {eips.map((e) => (
              <tr key={e.number} className="transition-colors hover:bg-muted/40">
                <td className="px-2 py-2.5 align-middle">
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
    </div>
  );
}

const phaseBadge = (status: string) =>
  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ' +
  (status === 'live'
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
    : status === 'in-progress'
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
      : 'border-border bg-muted/50 text-muted-foreground');

export default async function PqImplementationPage() {
  const elEips = PQ_EIPS.filter((e) => e.layer === 'Execution' || e.layer === 'Data');
  const clEips = PQ_EIPS.filter((e) => e.layer === 'Consensus');
  const pqDevnets = await prisma.devnet_specs
    .findMany({
      where: { series: 'pq', canceled: false },
      orderBy: { devnet_number: 'desc' },
      take: 4,
    })
    .catch(() => []);

  const healthEntries = await Promise.all(
    pqDevnets.map(async (d) => [d.id, d.active ? await fetchDoraHealth(d.id) : null] as const),
  );
  const doraById = new Map(healthEntries);

  return (
    <div className="space-y-4">
      {/* ── Core: the spec → running code matrix ───────────────────────── */}
      <section id="pq-implementation" className="scroll-mt-20 overflow-hidden rounded-xl border border-border bg-card/60">
        <div className="px-5 pt-5">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold tracking-tight text-foreground">Implementation &amp; devnet matrix</h2>
            <CopyLinkButton sectionId="pq-implementation" className="h-6 w-6" />
          </div>
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            EIP status alone doesn&apos;t tell you whether PQ work is becoming deployable. This tracks each proposal from
            spec to running code across the relevant clients, the measurable bridge between the EIP and upgrade readiness.
            Most PQ consensus work is early-stage, so the frontier is deliberately visible.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {IMPL_STATE_ORDER.map((s) => (
              <span key={s} className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold ${stateClass[s]}`}>
                {IMPL_STATE_LABEL[s]}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <Matrix title="Execution-layer PQ EIPs" clients={PQ_EL_CLIENTS} eips={elEips} />
          <Matrix title="Consensus-layer PQ EIPs" clients={PQ_CL_CLIENTS} eips={clEips} />
        </div>

        <p className="border-t border-border px-5 py-3 text-[12px] leading-relaxed text-muted-foreground">
          Curated from client PRs, the frames-devnet test suite, and ACD updates. Cells link to the implementation PR
          where one exists, bridging EIP specification and Forkcast-style upgrade readiness without duplicating either.
          Corrections welcome at dev@avarch.org.
        </p>
      </section>

      {/* ── Live PQ Consensus Devnets (from ethPandaOps / cartographoor) ─ */}
      {pqDevnets.length > 0 && (
        <section id="pq-devnets" className="scroll-mt-20 rounded-xl border border-border bg-card/60 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-base font-bold tracking-tight text-foreground">
              <Server className="h-4 w-4 text-primary" /> PQ Consensus Devnets
            </h2>
            <div className="flex items-center gap-3 text-xs">
              <Link href="/calls/pqi" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                <Video className="h-3.5 w-3.5" /> PQ Interop calls
              </Link>
              <Link href="/calls/acdc" className="inline-flex items-center gap-1 font-semibold text-muted-foreground hover:text-foreground hover:underline">
                ACDC calls
              </Link>
            </div>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            Spec scope, LeanVM version constraints, and fork context from ethPandaOps devnet notes alongside Dora Explorer links.
          </p>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {pqDevnets.map((d) => {
              const genesisDate = d.genesis_time
                ? new Date(Number(d.genesis_time) * 1000).toISOString().replace('T', ' ').slice(0, 16) + ' UTC'
                : null;
              const scopeLines = Array.isArray(d.announcements)
                ? d.announcements.filter((s): s is string => typeof s === 'string')
                : [];
              const scopeText = scopeLines
                .map((s) => s.replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'))
                .join(' · ');
              const doraUrl = `https://dora.${d.id}.ethpandaops.io`;

              return (
                <div key={d.id} className="flex flex-col justify-between rounded-lg border border-border bg-background/50 p-4">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-bold text-foreground">{d.title}</span>
                      <span className={phaseBadge(d.active ? 'live' : 'planned')}>
                        {d.active ? 'Active' : 'Archived'}
                      </span>
                    </div>
                    {genesisDate && (
                      <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                        Genesis · {genesisDate}
                      </p>
                    )}
                    {scopeText && (
                      <p className="mt-2 line-clamp-4 text-xs leading-relaxed text-muted-foreground">
                        {scopeText}
                      </p>
                    )}
                    {(() => {
                      const health = doraById.get(d.id);
                      if (!health) return null;
                      return (
                        <div className="mt-3 space-y-2 rounded-md border border-border/80 bg-card/70 p-2.5">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-foreground">
                            <span>Epoch {health.epoch}</span>
                            <span className="text-muted-foreground">·</span>
                            <span>{health.validators.toLocaleString()} validators</span>
                            <span className="text-muted-foreground">·</span>
                            <span>{health.participationPct}% participation</span>
                            <span className="text-muted-foreground">·</span>
                            <span>{health.proposed}/{health.proposed + health.missed} blocks</span>
                            <span className="text-muted-foreground">·</span>
                            <span className={health.finalized ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                              {health.finalized ? 'Finalized' : 'Unfinalized'}
                            </span>
                          </div>
                          {health.clients.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="mr-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                                Active clients:
                              </span>
                              {health.clients.map((c) => (
                                <span
                                  key={c}
                                  className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                                >
                                  {c}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
                    <a
                      href={doraUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/15"
                    >
                      Dora Explorer <ArrowUpRight className="h-3 w-3" />
                    </a>
                    {d.source_url && (
                      <a
                        href={d.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                      >
                        Devnet Spec Note <ArrowUpRight className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Evidence: the live PQ testnet (PQTS phases + Daisugi telemetry) ─ */}
      <section className="rounded-xl border border-border bg-card/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-bold tracking-tight text-foreground">
            <FlaskConical className="h-4 w-4 text-primary" /> Live PQ testnet
          </h2>
          <Link href={PQTS_TESTNET.callsHref} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            <Video className="h-3.5 w-3.5" /> PQTS breakout calls
          </Link>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          End-to-end PQ signatures exercised on a live research testnet. Chaired by {PQTS_TESTNET.chair}; contributors: {PQTS_TESTNET.contributors.join(', ')}.
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {PQTS_TESTNET.phases.map((p) => (
            <div key={p.version} className="rounded-lg border border-border bg-background/50 p-3.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-foreground">{p.version}</span>
                <span className={phaseBadge(p.status)}>
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

        {/* Live telemetry, proxied from explorer.daisugi.fyi, flows seamlessly below. */}
        <DaisugiPanel embedded />
      </section>

      {/* ── Reference: PQ signature schemes in play ────────────────────── */}
      <section className="rounded-xl border border-border bg-card/60 p-5">
        <h2 className="flex items-center gap-2 text-base font-bold tracking-tight text-foreground">
          <KeyRound className="h-4 w-4 text-primary" /> PQ signature schemes in play
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          Post-quantum signatures are much larger than the secp256k1 and BLS signatures Ethereum uses today. That size
          blow-up, below, is why in-mempool aggregation (EIP-8288) is the scalability piece of the PQ roadmap.
        </p>

        {/* Signature-size comparison */}
        {(() => {
          const sized = PQ_SCHEMES.filter((s) => typeof s.sigBytes === 'number').sort((a, b) => a.sigBytes! - b.sigBytes!);
          const max = Math.max(...sized.map((s) => s.sigBytes!));
          const base = PQ_SCHEMES.find((s) => s.name.startsWith('secp256k1'))?.sigBytes ?? 64;
          return (
            <div className="mt-4 rounded-lg border border-border bg-background/40 p-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Signature size by scheme</p>
              <div className="space-y-1.5">
                {sized.map((s) => {
                  const pct = Math.max(1.5, (s.sigBytes! / max) * 100);
                  const x = s.sigBytes! / base;
                  return (
                    <div key={s.name} className="flex items-center gap-2 sm:gap-3">
                      <span className="w-24 shrink-0 truncate font-mono text-[10px] text-foreground sm:w-32" title={s.paramSet}>{s.name}</span>
                      <div className="h-3.5 flex-1 overflow-hidden rounded bg-muted/50">
                        <div className={'h-full rounded ' + (s.baseline ? 'bg-muted-foreground/40' : 'bg-primary/70')} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-24 shrink-0 text-right font-mono text-[10px] text-muted-foreground sm:w-28">
                        {s.sigBytes!.toLocaleString()} B{!s.baseline && x >= 2 ? ` · ${Math.round(x)}x` : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
                Signature bytes per named parameter set; multiples are relative to secp256k1 (64 B). Grey bars are the
                classical schemes in use today. Lean-SPHINCS is omitted here because its value is aggregating many
                signatures into roughly one proof per block.
              </p>
            </div>
          );
        })()}

        <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
          {PQ_SCHEMES.map((s) => (
            <div key={s.name} className="rounded-lg border border-border bg-background/50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-foreground">
                  {s.name}
                  {s.baseline && <span className="rounded border border-border bg-muted/50 px-1 py-px text-[9px] font-normal uppercase text-muted-foreground">today</span>}
                  {s.aggregatable && <span className="rounded border border-primary/30 bg-primary/10 px-1 py-px text-[9px] font-normal uppercase text-primary">aggregatable</span>}
                </span>
                <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground">{s.family}</span>
              </div>
              {typeof s.sigBytes === 'number' && (
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                  sig {s.sigBytes.toLocaleString()} B · pk {s.pubKeyBytes?.toLocaleString()} B{s.paramSet ? ` · ${s.paramSet}` : ''}
                </p>
              )}
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground"><span className="font-medium text-foreground/80">{s.use}.</span> {s.note}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
