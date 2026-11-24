import type { Metadata } from 'next';
import { client } from '@/lib/orpc';
import { AdoptionDashboard } from './_client';

export const metadata: Metadata = {
  title: 'Ethereum Standards Adoption | EIPsInsight',
  description:
    'Which EIPs and ERCs are actually implemented and used on-chain. Evidence-based detection over our own Ethereum archive index: detected contracts, active contracts, and event volume per standard.',
  openGraph: {
    title: 'Ethereum Standards Adoption',
    description:
      'A live leaderboard of which Ethereum standards are implemented and used on-chain, measured from event evidence on our own archive node.',
  },
};

export const revalidate = 600;

export default async function AdoptionPage() {
  const [overview, leaderboard] = await Promise.all([
    client.adoption.overview(),
    client.adoption.leaderboard({ window: '30d' }),
  ]);
  return <AdoptionDashboard overview={overview} initialLeaderboard={leaderboard} />;
}
