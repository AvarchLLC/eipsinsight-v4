import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { PqShell } from './_shell';

export const metadata: Metadata = buildMetadata({
  title: 'Post-Quantum Readiness',
  description:
    "Observability for Ethereum's post-quantum migration: PQ-related EIPs, roadmap coverage, spec dependencies, and the open coordination gaps between research milestones and shipped protocol changes.",
  path: '/pq',
  keywords: ['post-quantum', 'PQ', 'Ethereum', 'EIP', 'XMSS', 'signature aggregation', 'quantum resistance'],
  image: null,
});

export default function PqLayout({ children }: { children: React.ReactNode }) {
  return <PqShell>{children}</PqShell>;
}
