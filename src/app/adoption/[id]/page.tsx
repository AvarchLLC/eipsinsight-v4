import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { client } from '@/lib/orpc';
import { StandardDetailView } from './_client';

export const revalidate = 600;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const d = await client.adoption.standard({ id, window: '30d' });
  if (!d.found || !d.meta) return { title: 'Standard not found | EIPsInsight' };
  return {
    title: `${d.meta.eip} on-chain adoption | EIPsInsight`,
    description: `On-chain adoption of ${d.meta.eip} (${d.meta.name}): detected implementing contracts, active contracts, and a contract directory.`,
  };
}

// The EIP/process metadata behind a standard, if we can resolve it.
export type ProposalMeta = {
  repo: 'eip' | 'erc';
  number: number;
  title: string;
  authors: string[];
  created: string | null;
  type: string | null;
  category: string | null;
  status: string;
  discussions_to: string | null;
  requires: number[];
} | null;

async function getProposalMeta(id: string): Promise<ProposalMeta> {
  const num = Number(id.split('-')[1]);
  if (!Number.isFinite(num) || num <= 0) return null;
  // The catalog id carries the repo: 'erc-4626' → ERC, 'eip-7702' → EIP.
  const repo: 'eip' | 'erc' = id.startsWith('eip-') ? 'eip' : 'erc';
  try {
    const p = await client.proposals.getProposal({ repo, number: num });
    return {
      repo,
      number: p.number,
      title: p.title,
      authors: p.authors ?? [],
      created: p.created ?? null,
      type: p.type ?? null,
      category: p.category ?? null,
      status: p.status ?? 'Unknown',
      discussions_to: p.discussions_to ?? null,
      requires: p.requires ?? [],
    };
  } catch {
    return null; // not synced / not found — show adoption only
  }
}

export default async function AdoptionStandardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [detail, proposal] = await Promise.all([
    client.adoption.standard({ id, window: '30d' }),
    getProposalMeta(id),
  ]);
  if (!detail.found) notFound();
  return <StandardDetailView initial={detail} proposal={proposal} />;
}
