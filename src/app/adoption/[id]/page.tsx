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

export default async function AdoptionStandardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await client.adoption.standard({ id, window: '30d' });
  if (!detail.found) notFound();
  return <StandardDetailView initial={detail} />;
}
