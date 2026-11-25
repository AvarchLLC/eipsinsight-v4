import type { Metadata } from 'next';
import { GlamsterdamResearch } from './_client';

export const metadata: Metadata = {
  title: 'What Glamsterdam Repricing changes | EIPsInsight Research',
  description:
    "Glamsterdam's EIP-8037/8038 reprice on-chain storage gas. A static scan of the busiest mainnet contracts against the repricing's invariant framework surfaces the ones worth re-checking.",
  openGraph: {
    title: 'What Glamsterdam Repricing changes',
    description:
      "EIP-8037/8038 reprice on-chain storage gas. We scanned the busiest mainnet contracts against the invariant framework to flag candidates for review.",
  },
};

export const revalidate = 3600;

export default function GlamsterdamResearchPage() {
  return <GlamsterdamResearch />;
}
