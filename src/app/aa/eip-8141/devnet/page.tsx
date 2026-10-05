import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { FramesDevnetPanel } from '@/components/aa/frames-devnet-panel';

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: 'EIP-8141 Frames Devnet Activity',
  description:
    'Live metrics from frames-devnet-0: frame-transaction throughput, native-AA validation cost, signature-scheme economics, and a post-quantum watch — measured from the public devnet execution RPC.',
  path: '/aa/eip-8141/devnet',
  keywords: ['EIP-8141', 'Frames', 'native account abstraction', 'frames-devnet', 'devnet metrics'],
  image: null,
});

export default function Eip8141DevnetPage() {
  return <FramesDevnetPanel />;
}
