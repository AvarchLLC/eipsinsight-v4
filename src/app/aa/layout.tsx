import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Account Abstraction Usage',
  description:
    'Live on-chain usage of Ethereum account abstraction: EIP-7702 (Set EOA code) and ERC-4337 (EntryPoint) transaction counts and trends, measured directly from mainnet.',
  path: '/aa',
  keywords: ['account abstraction', 'EIP-7702', 'ERC-4337', 'native account abstraction', 'EntryPoint', 'Ethereum'],
  image: null,
});

export default function AaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
