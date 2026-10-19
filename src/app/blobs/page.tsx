import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { BlobConsole } from '@/components/blobs/blob-console';

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: 'Blob Data Layer',
  description:
    'Live observability for Ethereum\'s blob data layer (EIP-4844): blob throughput, base-fee market, utilization, per-blob DA cost, and rollup DA share since Dencun — powered by BlobLens.',
  path: '/blobs',
  keywords: ['blobs', 'EIP-4844', 'data availability', 'rollup DA', 'blob fee', 'BlobLens', 'Ethereum'],
  image: null,
});

export default function BlobsPage() {
  return (
    <div className="page-shell space-y-6 pb-16">
      <header>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Data Availability
        </p>
        <h1 className="dec-title persona-title text-balance text-3xl font-semibold leading-[1.1] tracking-tight sm:text-4xl">
          Ethereum Blob Data Layer
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          How rollups use Ethereum for data availability since EIP-4844. Blob throughput, the blob fee market,
          utilization against the per-block cap, per-blob DA cost in USD, and which rollups are posting — on a
          customizable timeline from Dencun to now. Live metrics from{' '}
          <span className="font-medium text-foreground">BlobLens</span>.
        </p>
      </header>

      <BlobConsole />
    </div>
  );
}
