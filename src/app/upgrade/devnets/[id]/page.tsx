import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  Megaphone,
  Radio,
} from 'lucide-react';
import '@/lib/orpc.server';
import { cn } from '@/lib/utils';
import { buildMetadata } from '@/lib/seo';
import { getCachedDevnet } from '@/lib/upgrade-data.server';

export const revalidate = 300;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return buildMetadata({
    title: id,
    description: `Spec, EIP scope, and client support for the ${id} Ethereum devnet.`,
    path: `/upgrade/devnets/${id}`,
    keywords: ['Ethereum devnet', id],
  });
}

const EIP_STATUS_CHIP: Record<string, string> = {
  new: 'border-blue-500/30 bg-blue-500/15 text-blue-700 dark:text-blue-300',
  new_optional: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
  updated: 'border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300',
  required: 'border-red-500/30 bg-red-500/15 text-red-700 dark:text-red-300',
  optional: 'border-border bg-muted text-muted-foreground',
};

const SUPPORT_CELL: Record<string, { label: string; className: string }> = {
  supported: { label: '✓', className: 'text-emerald-500' },
  not_supported: { label: '✗', className: 'text-red-400' },
  in_progress: { label: '⚒', className: 'text-amber-400' },
  unknown: { label: '?', className: 'text-muted-foreground/60' },
};

function ClientSupportTable({
  title,
  support,
}: {
  title: string;
  support: { clients: string[]; matrix: Array<{ eipNumber: number; label: string; support: Record<string, string> }> };
}) {
  if (support.clients.length === 0 || support.matrix.length === 0) return null;

  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="overflow-hidden rounded-xl border border-border bg-card/60">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/70 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2">Feature</th>
                {support.clients.map((clientName) => (
                  <th key={clientName} className="px-3 py-2 text-center">
                    {clientName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {support.matrix.map((row) => (
                <tr key={`${row.eipNumber}-${row.label}`} className="border-b border-border/60 last:border-0">
                  <td className="px-3 py-2 text-xs font-medium text-foreground">
                    {row.eipNumber > 0 ? (
                      <Link href={`/eip/${row.eipNumber}`} className="text-primary hover:underline">
                        {row.label}
                      </Link>
                    ) : (
                      row.label
                    )}
                  </td>
                  {support.clients.map((clientName) => {
                    const value = row.support[clientName] ?? 'unknown';
                    const cell = SUPPORT_CELL[value];
                    return (
                      <td
                        key={clientName}
                        title={`${clientName}: ${value.replace('_', ' ')}`}
                        className={cn(
                          'px-3 py-2 text-center text-sm font-semibold',
                          cell?.className ?? 'text-muted-foreground'
                        )}
                      >
                        {cell?.label ?? value}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default async function DevnetDetailPage({ params }: Props) {
  const { id } = await params;
  const devnet = await getCachedDevnet(id);
  if (!devnet) notFound();

  const genesis = devnet.genesis_time
    ? new Date(devnet.genesis_time * 1000).toISOString().replace('T', ' ').slice(0, 16) + ' UTC'
    : null;
  const specRefs = devnet.spec_references;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 pb-12 pt-8 sm:px-6">
      <header>
        <Link
          href="/upgrade/devnets"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All devnets
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="dec-title persona-title text-balance text-3xl font-semibold tracking-tight leading-[1.1] sm:text-4xl">
            {devnet.title ?? devnet.id}
          </h1>
          {devnet.active && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              <Radio className="h-3 w-3" />
              live
            </span>
          )}
          {devnet.canceled && (
            <span className="rounded-full border border-red-500/30 bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-700 dark:text-red-300">
              canceled
            </span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
          {genesis && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              Genesis {genesis}
            </span>
          )}
          {devnet.source_url && (
            <a
              href={devnet.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary transition-colors hover:text-primary/80"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Full spec on notes.ethereum.org
            </a>
          )}
          {specRefs?.consensusSpecs?.url && (
            <a
              href={specRefs.consensusSpecs.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary transition-colors hover:text-primary/80"
            >
              consensus-specs {specRefs.consensusSpecs.version}
            </a>
          )}
          {specRefs?.executionSpecs?.url && (
            <a
              href={specRefs.executionSpecs.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary transition-colors hover:text-primary/80"
            >
              execution-specs {specRefs.executionSpecs.version}
            </a>
          )}
        </div>
      </header>

      {devnet.same_spec_as && (
        <p className="rounded-xl border border-border bg-card/60 px-4 py-3 text-sm text-muted-foreground">
          This devnet uses the same spec as{' '}
          <Link href={`/upgrade/devnets/${devnet.same_spec_as}`} className="text-primary hover:underline">
            {devnet.same_spec_as}
          </Link>
          .
        </p>
      )}

      {devnet.announcements.length > 0 && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Announcements</h2>
          </div>
          <ul className="mt-2 space-y-1.5">
            {devnet.announcements.map((announcement, index) => (
              <li
                key={index}
                className="line-clamp-4 break-words text-sm leading-relaxed text-muted-foreground"
                title={announcement.length > 300 ? announcement : undefined}
              >
                {announcement.length > 600 ? `${announcement.slice(0, 600)}…` : announcement}
              </li>
            ))}
          </ul>
        </div>
      )}

      {devnet.eips.length > 0 && (
        <section>
          <h2 className="dec-title mb-3 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            EIPs in scope
            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 align-middle text-xs font-semibold text-muted-foreground">
              {devnet.eips.length}
            </span>
          </h2>
          <div className="overflow-hidden rounded-xl border border-border bg-card/60">
            <table className="w-full text-sm">
              <tbody>
                {devnet.eips.map((eip) => (
                  <tr key={`${eip.number}-${eip.title}`} className="border-b border-border/60 last:border-0">
                    <td className="w-28 px-4 py-2.5 font-mono text-xs font-semibold">
                      <Link href={`/eip/${eip.number}`} className="text-primary hover:underline">
                        EIP-{eip.number}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-foreground">{eip.title}</td>
                    <td className="w-28 px-4 py-2.5 text-right">
                      {eip.status && (
                        <span
                          className={cn(
                            'inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium',
                            EIP_STATUS_CHIP[eip.status] ?? 'border-border bg-muted text-muted-foreground'
                          )}
                        >
                          {eip.status.replace('_', ' ')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="space-y-6">
        <ClientSupportTable title="Execution layer client support" support={devnet.el_client_support} />
        <ClientSupportTable title="Consensus layer client support" support={devnet.cl_client_support} />
      </section>

      {devnet.scraped_at && (
        <p className="text-[11px] text-muted-foreground">
          Scraped from ethpandaops {devnet.scraped_at.slice(0, 10)} · re-checked every 12 hours.
        </p>
      )}
    </div>
  );
}
